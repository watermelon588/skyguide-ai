import axios from "axios";

const API = `${import.meta.env.VITE_API_URL}/api/chat`;

export async function sendMessage(messages) {

    const res = await axios.post(API, {

        messages

    });

    return res.data.reply;

}