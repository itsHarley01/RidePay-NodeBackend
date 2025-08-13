const { db } = require('../config/firebase');

function normalize(str = "") {
  return str.toLowerCase().trim();
}

exports.getAllUsers = async (req, res) => {
  const { role, search } = req.query;

  try {
    const users = [];

    // Get both tables in parallel
    const [unregisteredSnap, registeredSnap] = await Promise.all([
      db.ref("user_us3r_4cc5").once("value"),
      db.ref("r3g1s_user_us3r_4cc5").once("value")
    ]);

    // Combine data from both if they exist
    const processSnapshot = (snap) => {
      if (!snap.exists()) return;

      const usersData = snap.val();

      Object.entries(usersData).forEach(([uid, user]) => {
        const userRole = user.role?.toLowerCase();
        const matchesRole = role ? userRole === role.toLowerCase() : true;

        const fullName = `${user.firstName} ${user.middleName || ""} ${user.lastName}`;
        const matchesSearch = search
          ? normalize(fullName).includes(normalize(search)) ||
            normalize(user.email).includes(normalize(search))
          : true;

        if (matchesRole && matchesSearch) {
          users.push({
            uid,
            ...user,
          });
        }
      });
    };

    // Process each snapshot safely
    processSnapshot(unregisteredSnap);
    processSnapshot(registeredSnap);

    if (users.length === 0) {
      return res.status(404).json({ message: "No matching users found." });
    }

    return res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
