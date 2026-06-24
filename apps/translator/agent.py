import json
import logging

from dotenv import load_dotenv

from livekit.agents import Agent, AgentServer, AgentSession, JobContext, JobProcess, cli, inference, room_io
from livekit.plugins import silero

load_dotenv()

logger = logging.getLogger("translator-agent")
logger.setLevel(logging.INFO)

server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


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


class Translator(Agent):
    def __init__(self, instructions: str) -> None:
        super().__init__(instructions=instructions)


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

    session = AgentSession(
        stt=inference.STT(
            model="deepgram/nova-3",
            language=source_language,
        ),
        llm=inference.LLM(
            model="google/gemini-2.5-flash-lite",
        ),
        tts=inference.TTS(
            model="cartesia/sonic-3",
            voice="9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
            language=target_language,
        ),
        vad=ctx.proc.userdata["vad"],
        preemptive_generation=True,
    )

    await session.start(
        room=ctx.room,
        agent=Translator(instructions),
        room_options=room_io.RoomOptions(
            audio_input=True,
            audio_output=True,
            text_output=False,
            video_input=False,
        ),
    )


if __name__ == "__main__":
    cli.run_app(server)
