import { Config } from "@remotion/cli/config";

// Silent by design (no audio track anywhere in this composition) — see README for why.
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
