import axios from "axios";

import { getApiBaseUrl } from "../config/network";

const API = getApiBaseUrl();

export const createRoom =
    async () => {
        const response =
            await axios.post(
                `${API}/api/v1/alignment/create-room`,
                {},
                {
                    withCredentials: true,
                }
            );

        return response.data;
    };