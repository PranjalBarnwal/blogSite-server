import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify } from "hono/jwt";
import { createBlogInput, updateBlogInput } from "@pranjalbarns/blog-common";

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
  Variables: {
    userId: string;
  };
}>();

/////////////
// blogRouter.delete("/deleteAll", async (c) => {
//   const prisma = new PrismaClient({
//     datasourceUrl: c.env.DATABASE_URL,
//   }).$extends(withAccelerate());

//   try {
//     await prisma.post.deleteMany({});
//     console.log('All posts deleted successfully.');
//   } catch (error) {
//     console.error('Error deleting posts:', error);
//   }
// });

////////////////

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const blogs = await prisma.post.findMany();
  if (!blogs) {
    c.status(400);
    return c.json({
      error: "Unable to fetch blogs",
    });
  }

  return c.json({
    blogs,
  });
});

blogRouter.get("/fetch/:id", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const id = c.req.param("id");
    const blog = await prisma.post.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        title: true,
        content: true,
        updatedAt: true,
        readtime: true,
        views: true,
        isAnonymous: true,
        tags: true,
        Vote: true,
        author: {
          select: {
            id: true,
            username: true,
            profileImg: true,
          },
        },
      },
    });

    if (!blog) {
      c.status(400);
      return c.json({
        error: "blog does not exist",
      });
    }
    return c.json({
      blog,
    });
  } catch (err) {
    c.status(411);
    return c.json({
      err,
    });
  }
});

blogRouter.use("/*", async (c, next) => {
  const header = c.req.header("authorization") || "";
  const token = header.split(" ")[1];

  const user = await verify(token, c.env.JWT_SECRET);
  if (user.id) {
    c.set("userId", user.id);
    // console.log(user);
    await next();
  } else {
    c.status(403);
    return c.json({ error: "Unauthorised" });
  }
});

blogRouter.get("/allPosts/:tags", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    
    const tagsParam = c.req.param("tags");
    console.log(tagsParam,"tags unfiltered");
    const selectedTags = tagsParam.length > 0 ? tagsParam.toLowerCase().split(',') : [];
    // const selectedTags:any = [];
    
    console.log(selectedTags);

    const posts = await prisma.post.findMany({
      where: selectedTags.length > 0 && selectedTags[0]!="nofilter" ? {
        tags: {
        hasEvery: selectedTags,
        },
      } : {}, 
      select: {
        id: true,
        title: true,
        content: true,
        publishedAt: true,
        tags: true,
        author: {
          select: {
            id: true,
            username: true,
            profileImg: true,
          },
        },
      },
    });
    console.log(posts.length);
    
    if (!posts) {
      c.status(400);
      return c.json({
        error: "Unable to fetch posts",
      });
    }

    return c.json({
      posts,
    });
  } catch (error) {
    console.error(error);
    c.status(500);
    return c.json({ message: "Error fetching posts" });
  }
});


blogRouter.post("/post", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const body = await c.req.json();

    const { success } = createBlogInput.safeParse(body);
    if (!success) {
      c.status(411);
      return c.json({
        message: "Insufficient Data",
      });
    }
    const authorId = c.get("userId");
    const blog = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: authorId,
        tags: body.tags,
        readtime: body.readtime,
      },
    });
    console.log(blog);
    return c.json({
      id: blog.id,
    });
  } catch (err) {
    c.status(411);
    return c.json({ err });
  }
});

blogRouter.put("/update", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const userId = c.get("userId");
  const body = await c.req.json();
  const { success } = updateBlogInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({
      message: "Insufficient Data",
    });
  }
  console.log(userId);

  try {
    const blog = await prisma.post.update({
      where: {
        id: body.id,
        authorId: userId,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });
    console.log(blog);

    if (!blog.id) {
      c.status(400);
      c.json({
        message:
          "Either no such blog is present or you don't have permission to edit",
      });
    }
    return c.json({
      id: blog.id,
    });
  } catch (err) {
    return c.json({
      err: "You cant't delete the post",
    });
  }
});

blogRouter.delete("/delete/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const id = c.req.param("id");
  const userId = c.get("userId");
  const deletedBlog = await prisma.post.delete({
    where: {
      id,
      authorId: userId,
    },
  });
  console.log(deletedBlog);
  c.json({
    deletedBlog,
  });
});

blogRouter.post("/vote", async (c) => {
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL,
    }).$extends(withAccelerate());
    const body = await c.req.json();
    const vote = await prisma.vote.create({
      data: {
        postId: body.postId, 
        userId: body.userId, 
        voteType: body.voteType, 
      },
    });
    console.log(vote);
    return c.json({
      vote,
    });
  } catch (err) {
    c.status(411);
    return c.json({ err });
  }
});
blogRouter.delete("/vote/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const id = c.req.param("id");
  const deletedVote = await prisma.vote.delete({
    where: {
      id,
    },
  });
  console.log(deletedVote);
  c.json({
    deletedVote,
  });
});

