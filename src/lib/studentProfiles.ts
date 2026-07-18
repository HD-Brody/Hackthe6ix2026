export type StudentId = "sam" | "elena";

export type StudentProfile = {
  id: StudentId;
  name: string;
  image: string;
  learningNote: string;
};

export const studentProfiles: Record<StudentId, StudentProfile> = {
  sam: {
    id: "sam",
    name: "Sam",
    image: "/students/sam.png",
    learningNote: "learns best from analogies and simple diagrams.",
  },
  elena: {
    id: "elena",
    name: "Elena",
    image: "/students/elena.png",
    learningNote: "learns best through examples and thoughtful questions.",
  },
};

export function getStudentProfile(value?: string): StudentProfile {
  return value === "elena" ? studentProfiles.elena : studentProfiles.sam;
}
