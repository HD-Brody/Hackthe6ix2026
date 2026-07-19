export type StudentId = "sam" | "elena";

export type StudentProfile = {
  id: StudentId;
  name: string;
  image: string;
  learningNote: string;
  /** ElevenLabs voice ID used for this student's TTS during sessions. */
  voiceId: string;
};

export const studentProfiles: Record<StudentId, StudentProfile> = {
  sam: {
    id: "sam",
    name: "Sam",
    image: "/students/sam.png",
    learningNote: "learns best from analogies and simple diagrams.",
    voiceId: "bIHbv24MWmeRgasZH58o", // Will — Relaxed Optimist
  },
  elena: {
    id: "elena",
    name: "Elena",
    image: "/students/elena.png",
    learningNote: "learns best through examples and thoughtful questions.",
    voiceId: "cgSgspJ2msm6clMCkdW9", // Jessica — Playful, Bright, Warm
  },
};

export function getStudentProfile(value?: string): StudentProfile {
  return value === "elena" ? studentProfiles.elena : studentProfiles.sam;
}

/** Coerce API / query input to a known student id. Defaults to Sam. */
export function parseStudentId(value: unknown): StudentId {
  return value === "elena" ? "elena" : "sam";
}
