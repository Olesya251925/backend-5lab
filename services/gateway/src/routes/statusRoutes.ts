import express, { Request, Response } from 'express';
import axios from 'axios';

const statusRoute = express.Router();

statusRoute.get('/status/:requestId', async (req: Request, res: Response) => {
    try {
        const { requestId } = req.params;
        const statusResult = await axios.get(`http://status-service:3007/api/status/${requestId}`, {
            validateStatus: function (status) {
                return status === 404 || (status >= 200 && status < 300);
            },
        });

        if (statusResult.status === 404) {
            res.status(404).json(statusResult.data);
            return;
        }
        res.status(200).json(statusResult.data);
    } catch (error) {
        console.error('Ошибка при получении статуса:', error);
        res.status(500).json({ error: 'Ошибка на стороне сервера' });
    }
});

export default statusRoute; 