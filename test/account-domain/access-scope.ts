import { recordType, stringType, Type } from "paratype";

export type AccessScope = {
    user_id: string,
};

export const accessScopeType: Type<AccessScope> = recordType({
    user_id: stringType,
});
