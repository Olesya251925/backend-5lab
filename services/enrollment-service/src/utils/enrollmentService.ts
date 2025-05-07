import axios from 'axios';
import { config } from '../config';
import Progress from '../models/progress';
import { ILesson, IProgressDocument } from '../types/lesson';

export const findUser = async (userId: number) => {
  try {
    const response = await axios.get(`${config.userServiceUrl}/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
};

export const findCourse = async (courseId: string) => {
  try {
    const response = await axios.get(`${config.courseServiceUrl}/courses/${courseId}`);
    return response.data;
  } catch (error) {
    console.error('Error finding course:', error);
    return null;
  }
};

export const findProgress = async (userId: number, courseId: string): Promise<IProgressDocument | null> => {
  try {
    return await Progress.findOne({ userId, courseId });
  } catch (error) {
    console.error('Error finding progress:', error);
    return null;
  }
};

export const createProgress = async (userId: number, courseId: string): Promise<IProgressDocument> => {
  try {
    const progress = new Progress({
      userId,
      courseId,
      lessonsCompleted: [],
      progressPercentage: 0,
    });
    return await progress.save();
  } catch (error) {
    console.error('Error creating progress:', error);
    throw error;
  }
};

export const getCourseLessons = async (courseId: string): Promise<ILesson[]> => {
  try {
    const response = await axios.get(`${config.lessonServiceUrl}/lessons/course/${courseId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting course lessons:', error);
    return [];
  }
};

export const calculateProgressPercentage = (totalLessons: number, completedLessons: number): number => {
  if (totalLessons === 0) return 0;
  return Math.round((completedLessons / totalLessons) * 100);
};

export const updateProgress = async (progress: IProgressDocument, lessonId: number, courseId: string): Promise<IProgressDocument> => {
  try {
    const lessons = await getCourseLessons(courseId);
    const totalLessons = lessons.length;
    const completedLessons = progress.lessonsCompleted.length;
    progress.progressPercentage = calculateProgressPercentage(totalLessons, completedLessons);
    return await progress.save();
  } catch (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
};

export const countEnrollments = async (courseId: string): Promise<number> => {
  try {
    return await Progress.countDocuments({ courseId });
  } catch (error) {
    console.error('Error counting enrollments:', error);
    return 0;
  }
}; 