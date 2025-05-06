import Course from "../models/course";

export async function getNextCourseId() {
  const lastCourse = await Course.findOne()
    .sort({ courseId: -1 })
    .select("courseId");
  return lastCourse ? lastCourse.courseId + 1 : 1;
}
