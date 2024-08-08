import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign, verify } from "hono/jwt";
import { signinInput, signupInput } from "@pranjalbarns/blog-common";

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  };
}>();

// userRouter.delete("/deleteAll", async (c) => {
//   const prisma = new PrismaClient({
//     datasourceUrl: c.env.DATABASE_URL,
//   }).$extends(withAccelerate());

//   try {
//     await prisma.user.deleteMany({});
//     console.log('All users deleted successfully.');
//   } catch (error) {
//     console.error('Error deleting users:', error);
//   }
// });

userRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const users = await prisma.user.findMany();
  if (!users) {
    c.status(400);
    return c.json({
      error: "Unable to fetch blogs",
    });
  }

  return c.json({
    users,
  });
});

userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = signupInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({
      message: "Insufficient Data",
    });
  }
  const user = await prisma.user.create({
    data: {
      username: body.username,
      email: body.email,
      password: body.password,
    },
  });

  const token = await sign({ id: user.id }, c.env.JWT_SECRET);
  return c.json({
    jwt: token,
    id: user.id,
    username:user.username
  });
});

userRouter.post("/completeProfile", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const body = await c.req.json();

    // Data validation (commented out for now)
    // const { success } = signupInput.safeParse(body);
    // if (!success) {
    //   c.status(411);
    //   return c.json({
    //     message: "Insufficient Data",
    //   });
    // }

    const user = await prisma.user.update({
      where: {
        id: body.id,
      },
      data: {
        profileImg: body.profileImg,
        bio: body.bio,
        social: body.social,
        securityQuestion: body.securityQuestion,
        securityAns: body.securityAns,
      },
    });
    return c.json({
      message: "successfully completed profile",
      profileImg: body.profileImg,
      bio: body.bio,
      social: body.social,
      securityQuestion: body.securityQuestion,
    });
  } catch (err) {
    console.error("error completing profile:", err);
    return c.json({ error: "error completing the profile" });
  }
});

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const { success } = signinInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({
      message: "Insufficient Data",
    });
  }
  const user = await prisma.user.findUnique({
    where: {
      email: body.email,
    },
  });

  if (!user) {
    c.status(403);
    return c.json({
      error: "user not found",
    });
  }
  if (!(user.password === body.password)) {
    c.status(403);
    return c.json({
      error: "incorrect credentials",
    });
  }
  const token = await sign({ id: user.id }, c.env.JWT_SECRET);
  return c.json({
    jwt: token,
    id:user.id,
    username:user.username,
    profileImg: user.profileImg,
    bio: user.bio,
    social: user.social,
    securityQuestion: user.securityQuestion,
  });
});

userRouter.post("/securityQuestion", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const user = await prisma.user.findUnique({
    where: {
      email: body.email,
    },
  });

  if (!user) {
    c.status(403);
    return c.json({
      error: "user not found",
    });
  }
  return c.json({
    question: user.securityQuestion,
  });
});

userRouter.post("/verifyAnswer", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();
  const user = await prisma.user.findUnique({
    where: {
      email: body.email,
    },
  });

  if (!user) {
    c.status(403);
    return c.json({
      error: "user not found",
    });
  } else {
    if (body.answer.toLowerCase().trim() === user.securityAns?.toLowerCase()) {
      return c.json({
        result: true,
        id: user.id,
      });
    } else {
      if (
        body.answer.toLowerCase().trim() === user.securityAns?.toLowerCase()
      ) {
        return c.json({
          result: false,
        });
      }
    }
  }
});


userRouter.put("/updateProfile",async(c)=>{
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body=await c.req.json();
  
  try{
    const updatedUser=await prisma.user.update({
      where:{
        id:body.id,
      },
      data:body  
    })
    return c.json({
      result: true,
      id: updatedUser.id,
    });
  }catch (error) {
    console.error('Error updating user:', error);
  }
})

userRouter.post("/resetPassword", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  const body = await c.req.json();

  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: body.id,
      },
      data: {
        password: body.password,
      },
    });
    if (updatedUser)
      return c.json({
        id: updatedUser.id,
        message: "updated password successfully",
      });
    else
      return c.json({
        err: "error while updating",
        message: "update unsuccessful",
      });
  } catch (err) {
    return c.json({
      err,
      message: "update unsuccessful",
    });
  }
});
