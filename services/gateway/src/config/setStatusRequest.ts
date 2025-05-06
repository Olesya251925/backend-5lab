import axios from "axios";
import config from "../utils/config";

export async function setStatusRequest(requestId: string, status: string, message: string) {
	try {
		const statusServiceUrl = config.statusServiceUrl;

		await axios.post(`${statusServiceUrl}/${requestId}`, {
			status,
			message,
		});
		return true;
	} catch (error) {
		console.error('Ошибка при обновлении сервиса статусов:', error);
		return false;
	}
}