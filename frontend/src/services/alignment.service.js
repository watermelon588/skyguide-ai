import axios from "axios";

const API =
    import.meta.env.VITE_API_URL;

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