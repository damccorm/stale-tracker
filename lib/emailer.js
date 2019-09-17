'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// Easiest way to kick of flow is to just send an email.
const nodemailer = require('nodemailer');
const temp = require('./main');
// async..await is not allowed in global scope, must use a wrapper
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // create reusable transporter object using the default SMTP transport
        const userName = process.env['username'];
        const passWord = process.env['password'];
        const recipient = process.env['recipient'];
        if (!userName) {
            throw new Error('username must be set in the environment');
        }
        if (!passWord) {
            throw new Error('password must be set in the environment');
        }
        if (!recipient) {
            throw new Error('recipient must be set in the environment');
        }
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: userName,
                pass: passWord
            }
        });
        // send mail with defined transport object
        let info = yield transporter.sendMail({
            from: userName,
            to: recipient,
            subject: 'Stale PRs',
            text: yield temp.run() // plain text body
        });
        console.log('Message sent: %s', info.messageId);
        // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>
        // Preview only available when sending through an Ethereal account
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
    });
}
main().catch(console.error);
