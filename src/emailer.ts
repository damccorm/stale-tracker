'use strict';
// Easiest way to kick of flow is to just send an email.
const nodemailer = require('nodemailer');
const temp = require('./main');

// async..await is not allowed in global scope, must use a wrapper
async function main() {
    // create reusable transporter object using the default SMTP transport
    const userName = process.env['INPUT_USERNAME'];
    const passWord = process.env['INPUT_PASSWORD'];
    if (!userName) {
        throw new Error('INPUT_USERNAME must be set in the environment')
    }
    if (!passWord) {
        throw new Error('INPUT_PASSWORD must be set in the environment')
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
        to: userName, // list of receivers
        subject: 'Stale PRs', // Subject line
        text: await temp.run() // plain text body
    });

    console.log('Message sent: %s', info.messageId);
    // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

    // Preview only available when sending through an Ethereal account
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

main().catch(console.error);