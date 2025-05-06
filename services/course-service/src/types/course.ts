export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface CourseRequiredFields {
  title?: string;
  price?: number;
  image?: string;
  category?: string;
  author?: string;
}
