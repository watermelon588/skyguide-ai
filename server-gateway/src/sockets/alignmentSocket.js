module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("Connected:", socket.id);

        console.log(socket.user);

        socket.on("join_room", ({ roomId }) => {
            socket.join(roomId);

            console.log(
                `${socket.id}
             joined
             ${roomId}`,
            );

            socket.emit("room_joined", {
                roomId,
            });
        });

        socket.on("disconnect", () => {
            console.log("Disconnected:", socket.id);
        });
    });
};
