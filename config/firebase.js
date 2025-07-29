var admin = require("firebase-admin");
var serviceAccount = require("./ridepay-30fcd-firebase-adminsdk-fbsvc-e03baff7af.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://ridepay-30fcd-default-rtdb.firebaseio.com"
});

const db = admin.database();
module.exports = db;