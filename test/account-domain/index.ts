import { DomainModel } from "../../src";
import { AccessScope, accessScopeType } from "./access-scope";
import { accountChanges, AccountChanges } from "./change-model";
import { accountViews, AccountViews } from "./read-model";
import { accountActions, AccountActions } from "./write-model";

export const accountModel: DomainModel<AccessScope, AccountChanges, AccountViews, AccountActions> = {
    scope: accessScopeType,
    events: accountChanges,
    views: accountViews,
    actions: accountActions,
};

export type AccountModel = typeof accountModel;
