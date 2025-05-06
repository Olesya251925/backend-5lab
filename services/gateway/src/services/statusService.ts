import axios from 'axios';

export const setStatusRequest = async (requestId: string, status: string, message: string): Promise<boolean> => {
    try {
        await axios.post('http://status-service:3007/api/status', {
            requestId,
            status,
            message
        });
        return true;
    } catch (error) {
        console.error('Ошибка при установке статуса:', error);
        return false;
    }
}; 