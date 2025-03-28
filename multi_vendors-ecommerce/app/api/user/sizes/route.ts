
import { dbConnect } from "@/lib/dbConnect";
import Size from "@/models/Size";
import { SizeValidationSchema } from "@/types/schemas";
import { NextResponse } from "next/server";
import Store from "@/models/Store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const _id = searchParams.get("_id");
  const storeId = searchParams.get("storeId");
  await dbConnect();
  try {
    if (storeId) {
      const data = await Size.find({ store: storeId }).populate("store").exec();
      return NextResponse.json({ data }, { status: 200 });
    }
    if (_id) {
      const data = await Size.findById(_id).lean();
      return NextResponse.json({ data }, { status: 200 });
    }
    const data = await Size.find({ status: "publish" })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ err }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await dbConnect();
  try {
    // Get request values
    const body = await req.json();

    // Server side validation
    const validatedFields = SizeValidationSchema.safeParse(body);
    if (!validatedFields.success) {
      return Response.json(
        {
          message: "validation error",
          errors: validatedFields.error.flatten().fieldErrors,
        },
        { status: 200 }
      );
    }

    //check duplication
    const checkDuplicate = await Size.findOne({ slug: body.slug }).lean();

    if (checkDuplicate) {
      return NextResponse.json(
        { message: "New size created.", data: checkDuplicate },
        { status: 200 }
      );
    }

    // Save data to db
    const data = await new Size(body).save();

    // Add size id to store
    if (data) {
      const newSize = {
        _id: data._id,
      };
      await Store.findByIdAndUpdate(body.store, {
        $push: { sizes: newSize },
      });
    }

    return NextResponse.json(
      { message: "New size created.", data, success: true },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json({ err }, { status: 500 });
  }
}
