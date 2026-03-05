import { timeStamp } from "node:console";
import { UAParser } from "ua-parser-js";

export const logger = (req, res, next) => {
    try {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        const parser = new UAParser(req.headers["user-agent"]);
        const userAgent = parser.getResult();
        const method = req.method;
        const url = req.originalUrl;
        const referer = req.headers["referer"];

        console.log({
            ip: ip,
            method: method,
            url: url,
            referer: referer,
            userAgent: userAgent,
            time: new Date()
        })

        next();

    } catch (error) {
        res.status(500).json({
            success: true,
            message: 'failed to parse the agent information',
            error: error.message
        })
    }
}