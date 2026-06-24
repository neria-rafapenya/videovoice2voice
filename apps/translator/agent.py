import asyncio
import json
import logging
import os

from dotenv import load_dotenv

from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    TurnHandlingOptions,
    cli,
    inference,
    room_io,
)

load_dotenv()

logger = logging.getLogger("translator-agent")
logger.setLevel(logging.INFO)

server = AgentServer()
VOICE_MODEL = "inworld/inworld-tts-2"
DEFAULT_TTS_VOICE = os.environ.get("TTS_VOICE_DEFAULT", os.environ.get("TTS_VOICE_MALE", "Diego"))
FEMALE_TTS_VOICE = os.environ.get("TTS_VOICE_FEMALE", "Ashley")


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = inference.VAD(model="silero")


server.setup_fnc = prewarm


def language_label(code: str) -> str:
    return {"es": "Spanish", "en": "English"}.get(code, code)


def build_instructions(source_language: str, target_language: str) -> str:
    source_label = language_label(source_language)
    target_label = language_label(target_language)

    return (
        "You are a live voice translator inside a LiveKit call.\n"
        f"Translate every spoken utterance from {source_label} into {target_label}.\n"
        "Speak only the translation. Never add explanations, labels, or commentary.\n"
        "Keep the translation natural, concise, and immediate.\n"
        "If the speaker hesitates or repeats words, keep the meaning and drop the filler.\n"
        "Do not wait for a manual prompt. Translate each completed utterance as soon as the user finishes speaking.\n"
    )


def build_translator_agent(instructions: str, voice_name: str, target_language: str) -> Agent:
    return Agent(
        instructions=instructions,
        tts=inference.TTS(
            model=VOICE_MODEL,
            voice=voice_name,
            language=target_language,
        ),
    )


@server.rtc_session(agent_name="translator-agent")
async def entrypoint(ctx: JobContext):
    metadata = json.loads(ctx.job.metadata or "{}")
    source_language = metadata.get("sourceLanguage", "es")
    target_language = metadata.get("targetLanguage", "en")
    tts_voice = metadata.get("ttsVoice", "male")
    translation_mode = metadata.get("translationMode", "fast")
    selected_voice = DEFAULT_TTS_VOICE if tts_voice == "male" else FEMALE_TTS_VOICE
    instructions = build_instructions(source_language, target_language)
    fast_mode = translation_mode == "fast"

    logger.info(
        "translator job started",
        extra={
            "room": ctx.room.name,
            "callId": metadata.get("callId"),
            "sourceLanguage": source_language,
            "targetLanguage": target_language,
            "ttsVoice": tts_voice,
            "translationMode": translation_mode,
        },
    )

    initial_voice = selected_voice
    session = AgentSession(
        stt=inference.STT(
            model="deepgram/nova-3",
            language=source_language,
        ),
        llm=inference.LLM(
            model="google/gemini-2.5-flash-lite",
        ),
        vad=ctx.proc.userdata["vad"],
        turn_handling=TurnHandlingOptions(
            turn_detection=inference.TurnDetector(),
            endpointing={
                "mode": "fixed",
                "min_delay": 0.05 if fast_mode else 0.12,
                "max_delay": 0.35 if fast_mode else 0.9,
            },
            preemptive_generation={
                "enabled": True,
                "preemptive_tts": fast_mode,
                "max_speech_duration": 8.0,
                "max_retries": 3,
            },
        ),
    )

    session_agent = build_translator_agent(instructions, initial_voice, target_language)
    alert_sent = False
    last_translated_transcript = ""
    last_partial_transcript = ""
    pending_translation_task: asyncio.Task[None] | None = None

    async def publish_status(level: str, message: str):
        payload = json.dumps(
            {
                "type": "translator-status",
                "level": level,
                "message": message,
                "callId": metadata.get("callId"),
            }
        )
        await ctx.room.local_participant.publish_data(payload, topic="translator-status")

    async def speak_translation(transcript: str, speaker_id: str | None):
        nonlocal alert_sent, last_translated_transcript

        normalized_transcript = transcript.strip()
        if not normalized_transcript or normalized_transcript == last_translated_transcript:
            return

        last_translated_transcript = normalized_transcript

        logger.info(
            "translating transcript",
            extra={
                "room": ctx.room.name,
                "callId": metadata.get("callId"),
                "speakerId": speaker_id,
                "voice": initial_voice,
                "transcript": normalized_transcript,
            },
        )

        try:
            await session.generate_reply(
                user_input=normalized_transcript,
                instructions=instructions,
                input_modality="text",
            )
            if alert_sent:
                await publish_status("ok", "Traducción activa")
                alert_sent = False
        except Exception as error:
            logger.exception(
                "translator synthesis failed",
                extra={
                    "room": ctx.room.name,
                    "callId": metadata.get("callId"),
                    "speakerId": speaker_id,
                    "voice": initial_voice,
                },
            )
            if not alert_sent:
                await publish_status(
                    "warning",
                    f"LiveKit TTS no puede sintetizar ahora mismo: {error}",
                )
                alert_sent = True

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event):
        nonlocal pending_translation_task, last_partial_transcript

        transcript = getattr(event, "transcript", "").strip()
        is_final = bool(getattr(event, "is_final", False))
        speaker_id = getattr(event, "speaker_id", None)

        if not transcript:
            return

        if fast_mode:
            if is_final:
                if pending_translation_task and not pending_translation_task.done():
                    pending_translation_task.cancel()
                asyncio.create_task(speak_translation(transcript, speaker_id))
                return

            if len(transcript) < 12 or transcript == last_partial_transcript:
                return

            last_partial_transcript = transcript

            if pending_translation_task and not pending_translation_task.done():
                pending_translation_task.cancel()

            async def delayed_translation(captured_transcript: str, captured_speaker_id: str | None):
                try:
                    await asyncio.sleep(0.15)
                except asyncio.CancelledError:
                    return

                if captured_transcript != last_partial_transcript:
                    return

                await speak_translation(captured_transcript, captured_speaker_id)

            pending_translation_task = asyncio.create_task(delayed_translation(transcript, speaker_id))
            return

        if not is_final:
            return

        asyncio.create_task(speak_translation(transcript, speaker_id))

    await session.start(
        room=ctx.room,
        agent=session_agent,
        room_options=room_io.RoomOptions(
            audio_input=True,
            audio_output=True,
            text_output=False,
            video_input=False,
        ),
    )

    await ctx.connect()


if __name__ == "__main__":
    cli.run_app(server)
