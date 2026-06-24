import json
import logging
import os

from dotenv import load_dotenv

from livekit.agents import Agent, AgentServer, AgentSession, JobContext, JobProcess, cli, room_io
from livekit.plugins import google, silero

load_dotenv()

logger = logging.getLogger("translator-agent")
logger.setLevel(logging.INFO)

server = AgentServer()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


def build_instructions(source_language: str, target_language: str) -> str:
    source_label = "Spanish" if source_language == "es" else "English"
    target_label = "English" if target_language == "en" else "Spanish"

    return (
        "You are a simultaneous voice translator inside a LiveKit call.\n"
        f"Translate every spoken utterance between {source_label} and {target_label}.\n"
        "Speak only the translation. Never add explanations, labels, or commentary.\n"
        "Keep the translation natural, concise, and immediate.\n"
        "If the speaker is speaking in the target language, translate back to the source language.\n"
        "If the speaker is speaking in the source language, translate to the target language.\n"
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
        llm=google.beta.realtime.RealtimeModel(
            model=os.environ.get(
                "GEMINI_REALTIME_MODEL",
                "gemini-2.5-flash-native-audio-preview-12-2025",
            ),
            instructions=instructions,
            voice=os.environ.get("GEMINI_VOICE", "Puck"),
            temperature=0.2,
            proactivity=False,
        ),
        vad=ctx.proc.userdata["vad"],
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
