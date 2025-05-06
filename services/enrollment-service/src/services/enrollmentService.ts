import Enrollment, { IEnrollment } from '../models/Enrollment';
import axios from 'axios';
import config from '../utils/config';

const calculateCourseProgress = async (
	userId: string,
	courseId: string,
): Promise<number> => {
	try {
		const enrollment = await Enrollment.findOne({ user: userId, course: courseId });

		if (!enrollment) {
			return 0;
		}

        const lessonRequest = await axios.get(`${config.lessonServiceUrl}/count/${courseId}`, {
			validateStatus: function (status) {
				return status >= 200 && status < 600;
			},
		});

		const totalLessons = lessonRequest.data;
		const completedLessonsCount = enrollment.lessonsCompleted.length;

		if (totalLessons === 0) {
			return 0;
		}

		const result = (completedLessonsCount / totalLessons) * 100;

		return result;
	} catch (error) {
		console.error(error);
		return 0;
	}
};

const enrollUserInCourse = async (userId: string, courseId: string): Promise<IEnrollment> => {
	try {
		const userRequest = await axios.get(`${config.userServiceUrl}/${userId}`, {
			validateStatus: function (status) {
				return status >= 200 && status < 600;
			},
		});

		if (userRequest.status === 404) {
			throw new Error('Пользователь не найден.');
		}

		const courseRequest = await axios.get(`${config.courseServiceUrl}/${courseId}`, {
			validateStatus: function (status) {
				return status >= 200 && status < 600;
			},
		});

		if (courseRequest.status === 404) {
			throw new Error('Курс не найден.');
		}

		const existingEnrollment = await Enrollment.findOne({ user: userId, course: courseId });
		if (existingEnrollment) {
			throw new Error('Пользователь уже записан на этот курс.');
		}

		const newEnrollment = new Enrollment({
			user: userId,
			course: courseId,
		});

		await newEnrollment.save();

		return newEnrollment;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

const completeLesson = async (userId: string, lessonId: string): Promise<IEnrollment> => {
	try {
		const userRequest = await axios.get(`${config.userServiceUrl}/${userId}`, {
			validateStatus: function (status) {
				return status >= 200 && status < 600;
			},
		});

		if (userRequest.status === 404) {
			throw new Error('Пользователь не найден.');
		}

		const lessonRequest = await axios.get(`${config.lessonServiceUrl}/${lessonId}`, {
			validateStatus: function (status) {
				return status >= 200 && status < 600;
			},
		});

		if (lessonRequest.status === 404) {
			throw new Error('Урок не найден');
		}

		const lesson = lessonRequest.data.lesson;

		const enrollment = await Enrollment.findOne({ user: userId, course: lesson.course });
		if (!enrollment) {
			throw new Error('Пользователь не записан на курс');
		}

		if (enrollment.lessonsCompleted.includes(lessonId)) {
			throw new Error('Урок уже выполнен');
		}

		enrollment.lessonsCompleted.push(lessonId);
		await enrollment.save();

		enrollment.progress = await calculateCourseProgress(userId, lesson.course);
		await enrollment.save();

		return enrollment;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

const uncompleteLesson = async (userId: string, lessonId: string): Promise<IEnrollment> => {
	try {
		const userRequest = await axios.get(`${config.userServiceUrl}/${userId}`, {
			validateStatus: function (status) {
				return status >= 200 && status < 600;
			},
		});

		if (userRequest.status === 404) {
			throw new Error('Пользователь не найден.');
		}

		const lessonRequest = await axios.get(`${config.lessonServiceUrl}/${lessonId}`, {
			validateStatus: function (status) {
				return status >= 200 && status < 600;
			},
		});

		if (lessonRequest.status === 404) {
			throw new Error('Урок не найден');
		}

		const lesson = lessonRequest.data.lesson;

		const enrollment = await Enrollment.findOne({ user: userId, course: lesson.course });
		if (!enrollment) {
			throw new Error('Пользователь не записан на этот курс.');
		}

		if (!enrollment.lessonsCompleted.includes(lessonId)) {
			throw new Error('Урок не пройден.');
		}

		const lessonIndex = enrollment.lessonsCompleted.indexOf(lessonId);
		enrollment.lessonsCompleted.splice(lessonIndex, 1);
		await enrollment.save();

		enrollment.progress = await calculateCourseProgress(userId, lesson.course);
		await enrollment.save();

		return enrollment;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

const getEnrollmentStatus = async (
	userId: string,
	courseId: string,
): Promise<IEnrollment | null> => {
	try {
		const enrollment = await Enrollment.findOne({ user: userId, course: courseId })

		if (!enrollment) {
			return null;
		}
		
		return enrollment;
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export {
	enrollUserInCourse,
	completeLesson,
	uncompleteLesson,
	getEnrollmentStatus,
	calculateCourseProgress,
};
