const { User } = require('../models')
const { currentUser } = require('../middlewares/guard')

const create = async (req, res) => {
  const { username, password, ownPassword } = req.body
  // verify password of adding user, except for initial user
  if ((await User.count()) > 0) {
    const user = await currentUser(req)
    if (!user) return res.status(401).send({})
    if (!user.validPassword(ownPassword || '')) return res.status(403).send({})
  }

  User.create({ username, password })
    .then(() => res.status(201).send({}))
    .catch((e) => res.status(400).send({}))
}

module.exports = { create }
