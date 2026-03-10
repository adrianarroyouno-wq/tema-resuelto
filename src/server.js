import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { supabase } from './lib/supabaseClient.js'

const app = express()

app.use(cors())
app.use(express.json())

/* ===============================
   HOME
================================ */
app.get('/', (req, res) => {
  res.send('API Tema Resuelto funcionando 🚀')
})

/* ===============================
   CATEGORIES
================================ */
app.get('/categories', async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true })

  return res.json({ data, error })
})

/* ===============================
   SERVICES - LISTAR
================================ */
app.get('/services', async (req, res) => {
  const { data, error } = await supabase
    .from('services')
    .select(`
      id,
      title,
      description,
      price,
      whatsapp,
      category_id,
      created_at,
      categories(id,name)
    `)
    .order('id', { ascending: false })

  return res.json({ data, error })
})

/* ===============================
   HELPERS WHATSAPP
================================ */
function cleanWhatsApp(value) {
  return (value || '').toString().replace(/[^\d]/g, '')
}
function isValidWhatsApp(value) {
  const v = cleanWhatsApp(value)
  return v.length === 0 || (v.length >= 10 && v.length <= 15)
}

/* ===============================
   SERVICES - CREAR
================================ */
app.post('/services', async (req, res) => {
  try {
    const { title, description, price, category_id, whatsapp } = req.body

    if (!title || !description || price === undefined || !category_id) {
      return res.status(400).json({
        data: null,
        error: { message: 'Faltan datos. Enviar: title, description, price, category_id (whatsapp opcional)' }
      })
    }

    const whatsappClean = cleanWhatsApp(whatsapp)
    if (!isValidWhatsApp(whatsappClean)) {
      return res.status(400).json({
        data: null,
        error: { message: 'WhatsApp inválido. Usá solo números. Ej: 5492641234567' }
      })
    }

    const { data, error } = await supabase
      .from('services')
      .insert([{
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category_id: Number(category_id),
        whatsapp: whatsappClean || null
      }])
      .select(`
        id,
        title,
        description,
        price,
        whatsapp,
        category_id,
        created_at,
        categories(id,name)
      `)
      .single()

    if (error) return res.status(400).json({ data: null, error })
    return res.json({ data, error: null })
  } catch (err) {
    return res.status(500).json({ data: null, error: { message: err.message } })
  }
})

/* ===============================
   SERVICES - EDITAR
================================ */
app.put('/services/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { title, description, price, category_id, whatsapp } = req.body

    if (!title || !description || price === undefined || !category_id) {
      return res.status(400).json({
        data: null,
        error: { message: 'Faltan datos. Enviar: title, description, price, category_id (whatsapp opcional)' }
      })
    }

    const whatsappClean = cleanWhatsApp(whatsapp)
    if (!isValidWhatsApp(whatsappClean)) {
      return res.status(400).json({
        data: null,
        error: { message: 'WhatsApp inválido. Usá solo números. Ej: 5492641234567' }
      })
    }

    const { data, error } = await supabase
      .from('services')
      .update({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category_id: Number(category_id),
        whatsapp: whatsappClean || null
      })
      .eq('id', id)
      .select(`
        id,
        title,
        description,
        price,
        whatsapp,
        category_id,
        created_at,
        categories(id,name)
      `)
      .single()

    if (error) return res.status(400).json({ data: null, error })
    return res.json({ data, error: null })
  } catch (err) {
    return res.status(500).json({ data: null, error: { message: err.message } })
  }
})

/* ===============================
   SERVICES - ELIMINAR
================================ */
app.delete('/services/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)

    if (error) return res.status(400).json({ success: false, error })
    return res.json({ success: true, error: null })
  } catch (err) {
    return res.status(500).json({ success: false, error: { message: err.message } })
  }
})

/* ===============================
   SERVER START
================================ */
app.listen(3000, () => {
  console.log('Servidor Tema Resuelto corriendo en puerto 3000 🚀')
})