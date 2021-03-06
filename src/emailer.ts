'use strict';
// Easiest way to kick of flow is to just send an email.
const nodemailer = require('nodemailer');
const temp = require('./main');

// async..await is not allowed in global scope, must use a wrapper
async function main() {
    const stalePrs: string = await temp.run(true);
    if (!stalePrs) {
        console.log('No stale PRs!');
        return;
    }

    // create reusable transporter object using the default SMTP transport
    const userName = process.env['username'];
    const passWord = process.env['password'];
    const recipient = process.env['recipient'];
    if (!userName) {
        throw new Error('username must be set in the environment')
    }
    if (!passWord) {
        throw new Error('password must be set in the environment')
    }
    if (!recipient) {
        throw new Error('recipient must be set in the environment')
    }
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: userName,
            pass: passWord
        }
    });

    // send mail with defined transport object
    let info = await transporter.sendMail({
        from: userName, // sender address
        to: recipient, // list of receivers
        subject: 'Stale PRs', // Subject line
        html: stalePrs // plain text body
    });

    console.log('Message sent: %s', info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

main().catch(console.error);