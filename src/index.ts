import { Hono } from 'hono'
import userRouter from './routes/user'
import blogRouter from './routes/blog'

const app = new Hono();

// Routes
app.route('/api/v1/user', userRouter)
app.route('/api/v1/blog', blogRouter)

app.get('/', (c) => {
  return c.text('signup route')
})

export default app
