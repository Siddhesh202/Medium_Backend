import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'
import {createPostInput, updatePostInput} from "@siddhesh30/common"

const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string
    },
    Variables: {
        userId: string
    }
}>();

// Middlewares

blogRouter.use('/*', async(c, next) => {
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

blogRouter.post('/', async(c) => {
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


blogRouter.put('/', async (c) => {
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

blogRouter.get('/:id', async(c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate())

    const id = c.req.param('id');
    const post = await prisma.post.findUnique({
        where: { id }
    });
    
    return c.json(post);
})

export default blogRouter;