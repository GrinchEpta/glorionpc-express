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

router.get('/me', (req, res) => {
  if (!req.session.isAdmin) {
    return res.status(401).json({ message: 'Не авторизован' })
  }

  return res.json({ ok: true, isAdmin: true })
})

router.post('/logout', (req, res) => {
  delete req.session.isAdmin

  req.session.save((error) => {
    if (error) {
      return res.status(500).json({ message: 'Не удалось выйти из админки' })
    }

    return res.json({ ok: true, message: 'Выход выполнен' })
  })
})

module.exports = router