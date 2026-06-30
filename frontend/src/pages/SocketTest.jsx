import { useState } from "react";
import { createRoom } from "../services/alignment.service";
import { createSocket } from "../services/socket.service";

export default function SocketTest() {
  const [room, setRoom] = useState(null);
  const [socketId, setSocketId] = useState("");

  const connect = async () => {
    try {
      const response = await createRoom();
      const { roomId, token } = response.data;
      setRoom(roomId);

      const socket = createSocket(token);

      socket.connect();
      socket.on("connect", () => {
        console.log("Connected:", socket.id);

        setSocketId(socket.id);

        socket.emit("join_room", {
          roomId,
        });
      });

      socket.on("room_joined", (data) => {
        console.log(data);
      });

      socket.on("pairing_error", () => {
        console.log("Pairing failed");
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h1>Socket Test</h1>

      <button onClick={connect}>Create Room</button>

      <p>
        Room:
        {room}
      </p>

      <p>
        Socket:
        {socketId}
      </p>
    </div>
  );
}
