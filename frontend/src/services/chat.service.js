import axios from "axios";

import { getApiBaseUrl } from "../config/network";

const API = `${getApiBaseUrl()}/api/chat`;

export async function sendMessage(messages) {

    const res = await axios.post(API, {

        messages

    });

    return res.data.reply;

}