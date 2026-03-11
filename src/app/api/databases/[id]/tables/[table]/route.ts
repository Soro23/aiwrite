import { NextRequest } from "next/server";
import { getAuthFromRequest } from "@/lib/auth/middleware";
import { getTableColumns, getTableRows } from "@/services/database.service";
import { ServiceError } from "@/lib/errors";
import { success, apiError } from "@/lib/api/response";
import { TableNameSchema, ListRowsSchema } from "@/validators/database.validator";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; table: string }> }
) {
  const auth = getAuthFromRequest(request);
  if (!auth) return apiError("Unauthorized", 401);

  try {
    const { id, table } = await params;

    const tableNameResult = TableNameSchema.safeParse(table);
    if (!tableNameResult.success) return apiError("Invalid table name", 400);

    const { searchParams } = request.nextUrl;
    const rowsParams = ListRowsSchema.safeParse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    if (!rowsParams.success) return apiError(rowsParams.error.errors[0].message, 400);

    const [columns, { rows, total }] = await Promise.all([
      getTableColumns(auth.sub, id, tableNameResult.data),
      getTableRows(auth.sub, id, tableNameResult.data, rowsParams.data.page, rowsParams.data.limit),
    ]);

    return success({
      columns,
      rows,
      total,
      page: rowsParams.data.page,
      limit: rowsParams.data.limit,
    });
  } catch (err) {
    if (err instanceof ServiceError) return apiError(err.message, err.statusCode);
    return apiError("Internal server error", 500);
  }
}
