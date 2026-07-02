const { askGroq } = require("../services/groqService");

exports.chat = async function chat(req, res) {

    try {

        const { messages } = req.body;

        if (!messages) {

            return res.status(400).json({

                success: false,

                message: "Messages are required."

            });

        }

        const reply = await askGroq(messages);

        return res.json({

            success: true,

            reply

        });

    }

    catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            message: "Groq Error"

        });

    }

}