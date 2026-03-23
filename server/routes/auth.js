const express = require('express')
const router = express.Router()

const ADMIN_LOGIN = 'admin'
const ADMIN_PASSWORD = '12345'

router.post('/login', (req, res) => {
  const { login, password } = req.body

  if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true
    return res.json({ message: 'Успешный вход' })
  }

  res.status(401).json({ message: 'Неверный логин или пароль' })
})

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Выход выполнен' })
  })
})

module.exports = router