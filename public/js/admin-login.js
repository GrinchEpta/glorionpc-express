function resetAdminLoginFields() {
  form?.reset()

  document.querySelectorAll('#login-form input').forEach((input) => {
    input.value = ''
    input.setAttribute('autocomplete', input.type === 'password' ? 'new-password' : 'off')
  })
}

window.addEventListener('pageshow', resetAdminLoginFields)

const form = document.getElementById('login-form')
const errorBlock = document.getElementById('error')

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const formData = new FormData(form)

  const data = {
    login: formData.get('login'),
    password: formData.get('password'),
  }

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message)
    }

    window.location.href = '/admin'
  } catch (error) {
    errorBlock.textContent = error.message
  }
})