/**
 * Shared JSDoc types for automation rules.
 *
 * @typedef {'field_eq'|'field_neq'|'field_contains'|'field_gt'|'field_gte'|'spam_score_gt'|'spam_score_gte'|'any_field_contains'} RuleConditionType
 * @typedef {'notify_channels'|'notify_workspace'|'ignore'|'set_field'|'set_priority'} RuleActionType
 *
 * @typedef {Object} RuleCondition
 * @property {RuleConditionType} type
 * @property {string} [field]
 * @property {string|number} [value]
 *
 * @typedef {Object} RuleAction
 * @property {RuleActionType} type
 * @property {string[]} [channels]
 * @property {string} [workspace]
 * @property {string} [field]
 * @property {string} [value]
 *
 * @typedef {Object} AutomationRule
 * @property {string} id
 * @property {string} userId
 * @property {string} name
 * @property {string} [description]
 * @property {boolean} enabled
 * @property {number} priority
 * @property {boolean} stopProcessing
 * @property {RuleCondition[]} conditions
 * @property {RuleAction[]} actions
 *
 * @typedef {Object} RuleEvaluationContext
 * @property {Record<string, string>} payload
 * @property {number|null} spamScore
 * @property {Record<string, import('@/lib/notifications/providers/base').ChannelEntry>} channelConfigs
 *
 * @typedef {Object} RuleEvaluationResult
 * @property {Record<string, string>} payload
 * @property {Record<string, import('@/lib/notifications/providers/base').ChannelEntry>} channelConfigs
 * @property {boolean} ignore
 * @property {boolean} channelFilterApplied
 * @property {boolean} hasSpamScoreCondition
 * @property {string[]} matchedRuleIds
 * @property {string[]} matchedRuleNames
 * @property {Array<{ruleId:string,action:string,detail?:string}>} appliedActions
 */

export {};
