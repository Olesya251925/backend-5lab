import { CourseRequiredFields } from "../types/course";

export const validateRequiredCourseFields = (fields: CourseRequiredFields): boolean => {
  const { title, price, image, category, author } = fields;
  return !(title && price && image && category && author);
};
