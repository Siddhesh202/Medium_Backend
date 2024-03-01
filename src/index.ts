import { Hono } from 'hono'
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import { sign, verify} from "hono/jwt"
import { signinInput, signupInput, createPostInput, updatePostInput } from "@siddhesh30/common"

const app = new Hono<{
	Bindings: {
		DATABASE_URL: string,
    JWT_SECRET: string
	}, 
  Variables : {
		userId: string
	}
}>();

// Middlewares 
app.use('/api/v1/blog/*', async(c, next) => {
  // get and verify the header
  const jwt = c.req.header('Authorization') || "";
  const token = jwt.split(' ')[1];
  const response = await verify(token, c.env.JWT_SECRET);

  // if header is correct then proceed 
  if(response) {
    c.set('userId', response.id);
    await next();
  }else {
    c.status(401);
    return c.json({error: "unauthorized"});
  }
})

// Routes
app.get('/', (c) => {
  return c.text('signup route')
})

app.post('/api/v1/signup', async(c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const body = await c.req.json();
  const { success } = signupInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}

  try {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password
      },
    })

    const jwt = await sign({id: user.id}, c.env.JWT_SECRET);
    return c.json({ jwt });

  } catch (error) {
    c.status(403);
		return c.json({ error: "error while signing up" });
  }

})

app.post('/api/v1/signin', async(c) => {
  const prisma = new PrismaClient({
		datasourceUrl: c.env?.DATABASE_URL	,
	}).$extends(withAccelerate());

	const body = await c.req.json();
  const { success } = signinInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}

  const user = await prisma.user.findUnique({
    where: {
      email: body.email,
      password: body.password
    }
  })

  if(!user){
    c.status(403);
		return c.json({ error: "user not found" });
  }

  const jwt = await sign({id: user.id}, c.env.JWT_SECRET);
  return c.json({ jwt });
})

app.post('/api/v1/blog', async(c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const userId = c.get("userId");
  const body = await c.req.json();
  const { success } = createPostInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}

  const post = await prisma.post.create({
    data: {
      title: body.title,
      content: body.title,
      authorId: userId
    }
  });

	return c.json({
		id: post.id
	});
})

app.put('/api/v1/blog', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const userId = c.get("userId");
  const body = await c.req.json();
  const { success } = updatePostInput.safeParse(body);
	if (!success) {
		c.status(400);
		return c.json({ error: "invalid input" });
	}

  await prisma.post.update({
    where: {
      id: body.id,
      authorId: userId
    },
    data: {
      title: body.title,
      content: body.content
    }
  })
  
  return c.text('updated post');
})

app.get('/api/v1/blog/:id', async(c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const id = c.req.param('id');
  const post = await prisma.post.findUnique({
    where: { id }
  });
  
  return c.json(post);
})

export default app
