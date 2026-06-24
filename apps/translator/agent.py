import json
import logging
import os
from itertools import cycle

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
FEMALE_VOICE = os.environ.get("TTS_VOICE_FEMALE", "Ashley")
MALE_VOICE = os.environ.get("TTS_VOICE_MALE", "Diego")


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = inference.VAD(model="silero")
    proc.userdata["speaker_voices"] = {}
    proc.userdata["voice_cycle"] = cycle((FEMALE_VOICE, MALE_VOICE))


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


def next_voice(proc: JobProcess) -> str:
    return next(proc.userdata["voice_cycle"])


def voice_for_speaker(proc: JobProcess, speaker_id: str | None) -> str:
    if not speaker_id:
        return FEMALE_VOICE

    speaker_voices = proc.userdata["speaker_voices"]
    if speaker_id not in speaker_voices:
        speaker_voices[speaker_id] = next_voice(proc)

    return speaker_voices[speaker_id]


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
    instructions = build_instructions(source_language, target_language)

    logger.info(
        "translator job started",
        extra={
            "room": ctx.room.name,
            "callId": metadata.get("callId"),
            "sourceLanguage": source_language,
            "targetLanguage": target_language,
        },
    )

    initial_voice = FEMALE_VOICE
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
                "min_delay": 0.2,
                "max_delay": 1.0,
            },
            preemptive_generation={
                "enabled": True,
                "preemptive_tts": True,
                "max_speech_duration": 8.0,
                "max_retries": 3,
            },
        ),
    )

    session_agent = build_translator_agent(instructions, initial_voice, target_language)
    active_voice = initial_voice

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event):
        transcript = getattr(event, "transcript", "").strip()
        is_final = bool(getattr(event, "is_final", False))
        speaker_id = getattr(event, "speaker_id", None)

        if not is_final or not transcript:
            return

        voice_name = voice_for_speaker(ctx.proc, speaker_id)
        logger.info(
            "user transcript received",
            extra={
                "room": ctx.room.name,
                "callId": metadata.get("callId"),
                "speakerId": speaker_id,
                "voice": voice_name,
                "transcript": transcript,
            },
        )

        nonlocal active_voice
        if voice_name != active_voice:
            session.update_agent(build_translator_agent(instructions, voice_name, target_language))
            active_voice = voice_name

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
