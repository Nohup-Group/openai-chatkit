import { ColorScheme, StartScreenPrompt, ThemeOption } from "@openai/chatkit";

export const CHATKIT_API_URL =
  process.env.NEXT_PUBLIC_CHATKIT_API_URL?.trim() ??
  "http://localhost:8000/chatkit";

export const CHATKIT_DOMAIN_KEY =
  process.env.NEXT_PUBLIC_CHATKIT_DOMAIN_KEY?.trim() ?? "local-dev";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "Was kannst du tun?",
    prompt: "Was kannst du tun?",
    icon: "circle-question",
  },
];

export const PLACEHOLDER_INPUT = "schlaue Rechtsfrage...";

export const GREETING = "Wie kann ich Ihnen helfen, liebe RuP-Mitarbeitenden?";

export const getThemeConfig = (theme: ColorScheme): ThemeOption => ({
  color: {
    grayscale: {
      hue: 0,
      tint: theme === "dark" ? 4 : 8,
      shade: theme === "dark" ? -2 : -4,
    },
    accent: {
      primary: "#bb0a30",
      level: 2,
    },
  },
  radius: "round",
  // Add other theme options here
  // chatkit.studio/playground to explore config options
});
