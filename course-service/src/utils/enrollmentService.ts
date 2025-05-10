import Progress, { IProgress } from "../models/enrollment";
import Lesson from "../models/lesson";
import Course from "../models/course";
import User from "../models/user";

export const findUser = async (userId: string) => {
  return await User.findOne({ id: userId });
};

export const findCourse = async (courseId: string) => {
  return await Course.findOne({ courseId });
};

export const findProgress = async (userId: string, courseId: string) => {
  return await Progress.findOne({ userId, courseId });
};

export const createProgress = async (userId: string, courseId: string) => {
  const progress = new Progress({
    userId,
    courseId,
    lessonsCompleted: [],
    progressPercentage: 0,
  });
  return await progress.save();
};

export const getCourseLessons = async (courseId: string) => {
  return await Lesson.find({ courseIds: courseId });
};

export const calculateProgressPercentage = (totalLessons: number, completedLessons: number) => {
  return totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
};

export const countEnrollments = async (courseId: string) => {
  return await Progress.countDocuments({ courseId });
};

export const updateProgress = async (progress: IProgress, lessonId: number, courseId: string) => {
  const lessons = await Lesson.find({ courseIds: courseId });
  const lessonIds = lessons.map((l) => l.id);

  const totalLessons = lessonIds.length;
  const completedLessons = progress.lessonsCompleted.filter((id: number) =>
    lessonIds.includes(id),
  ).length;

  const progressPercentage = calculateProgressPercentage(totalLessons, completedLessons);
  progress.progressPercentage = Math.min(progressPercentage, 100);

  return await progress.save();
};
