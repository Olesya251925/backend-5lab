import jwt from 'jsonwebtoken';
import config from '../utils/config';

const JWT_EXPIRES_IN = '1h';

export const generateToken = (id: string) => {
	return jwt.sign({ id }, config.jwtKey, {
		expiresIn: JWT_EXPIRES_IN,
	});
};