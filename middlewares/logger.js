import { UAParser } from "ua-parser-js";
import { prisma } from '../config/prisma.js'

export const logger = async (req, res, next) => {
    try {
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        const parser = new UAParser(req.headers["user-agent"]);
        const device = parser.getResult();

        const logData = {
            ip: ip,
            browser_v: device.browser.version || 'undefined',
            os: device.os.name || 'undefined',
            os_v: device.os.version || 'undefined',
            route: req.originalUrl || 'undefined',
            method: req.method || 'undefined',
            browser: device.browser.name || 'undefined'
        }

        const logResult = await prisma.logs.create({
            data: logData
        })

        next();

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'failed to parse the agent information',
            error: error.message
        })
    }
}