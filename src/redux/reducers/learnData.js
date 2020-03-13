import { cloneDeep, merge as mergeDeep } from 'lodash'
import { SafeQueue } from '../../utils/DataStructures'

import {
	SET_ACTIVITY_SKELETON,
	SET_ACTIVITY_PROGRESS,
	SET_UNLOCKED_CARDS,
	SET_CARD_STATUSES,
	RESET_TO_INITIAL_STATE,
	SET_CARD,
	SET_HINT,
	SET_CURRENT_CARD_BY_INDEX,
	INCREMENT_CURRENT_CARD_INDEX,
	SET_LAST_CARD_UNLOCKED_INDEX_BY_ID,
	INCREMENT_LAST_CARD_UNLOCKED_INDEX,
	SET_SUBMITTED_CHECKPOINT_SUCCESSFUL,
	BROADCAST_BUTTON_STATE,
	SCHEDULE_BUTTON_STATE,
	RESET_BUTTON_STATE_SCHEDULE,
	PUSH_TO_LOADED_CHECKPOINTS_PROGRESS
} from '../actionTypes'

const initialState = {
	// variables helpful for navigation, etc
	indicators: {
		currentCardIndex: undefined,
		lastCardUnlockedIndex: undefined, // must be undefined bc of isCardUnlocked, shuld be moved to progress at some point
		lastHintUnlockedId: undefined,
		submittedCheckpointSuccessful: undefined,

		currentButtonState: undefined,
		buttonStateScheduleQueue: new SafeQueue([]) // must be initialized
	},
	progress: {
		lastCardUnlockedIndex: undefined, // disconnected rn, refer to above
		hintsProgress: {},
		checkpointsProgress: {}
	},
	cards: [
		// {
		// 	id: undefined,
		// 	contentfulId: undefined,
		// 	name: undefined,
		// 	order: undefined,
		// 	hints: [],
		// 	content: undefined,
		// 	gems: undefined,
		// 	unlockedHints: [],
		// 	lockedHints: [],
		// 	concepts: [],
		// 	checkpoint: undefined
		// }
		// ... and more cards
	]
}

const reducer = (state = initialState, action) => {
	switch (action.type) {
		case SET_ACTIVITY_SKELETON: {
			return { ...state, ...action.activity }
		}

		case SET_ACTIVITY_PROGRESS: {
			return {
				...state,
				indicators: { ...state.indicators, ...action.activityProgress }
			}
		}

		case SET_UNLOCKED_CARDS: {
			const nextState = {
				...state,
				cards: cloneDeep(state.cards)
			}
			action.unlockedCards.forEach((card, i) => {
				mergeDeep(nextState.cards[i], card)
			})
			return nextState
		}

		case SET_CARD_STATUSES: {
			const nextState = {
				...state,
				cards: cloneDeep(state.cards)
			}
			action.cardStatuses.forEach((cardStatus, i) => {
				nextState.cards[i].hints = cardStatus
				hintStatusSeparation(nextState.cards[i])
			})
			return nextState
		}

		case RESET_TO_INITIAL_STATE: {
			return initialState
		}

		case SET_CARD: {
			const nextState = {
				...state,
				cards: cloneDeep(state.cards)
			}
			const {
				cards,
				indicators: { lastCardUnlockedIndex }
			} = nextState
			hintStatusSeparation(action.card)
			mergeDeep(cards[lastCardUnlockedIndex], action.card)
			return nextState
		}

		case SET_HINT: {
			// use hints not lockedhints instead because lockedhints removes nested objects
			const { id, contentId, hint: nextHint } = action
			const nextState = {
				...state,
				indicators: {
					...state.indicators,
					lastHintUnlockedId: id
				},
				cards: cloneDeep(state.cards)
			}

			const card = nextState.cards[nextState.indicators.currentCardIndex]

			const hintUnlockMovement = node => {
				if (!node.hints) return
				// if (!node.unlockedHints) return alert('bruh chill, wait a sec')
				// TODO make a notification: wait a bit nicer

				node.hints.some(hint => {
					// find hint
					if (hint.contentfulId === contentId) {
						nextHint.isUnlocked = true
						mergeDeep(hint, nextHint)
						node.unlockedHints.push(hint)
						return true
					}
					return hintUnlockMovement(hint)
				})
			}

			hintUnlockMovement(card)

			return nextState
		}

		case SET_CURRENT_CARD_BY_INDEX: {
			return {
				...state,
				indicators: {
					...state.indicators,
					currentCardIndex: action.cardIndex,
					lastHintUnlockedId: undefined // smooth slidein for hints
				}
			}
		}
		case INCREMENT_CURRENT_CARD_INDEX: {
			return {
				...state,
				indicators: {
					...state.indicators,
					currentCardIndex: state.indicators.currentCardIndex + 1
				}
			}
		}

		case SET_LAST_CARD_UNLOCKED_INDEX_BY_ID: {
			return {
				...state,
				indicators: {
					...state.indicators,
					lastCardUnlockedIndex: action.cardIndex
				}
			}
		}
		case INCREMENT_LAST_CARD_UNLOCKED_INDEX: {
			return {
				...state,
				indicators: {
					...state.indicators,
					lastCardUnlockedIndex: state.indicators.lastCardUnlockedIndex + 1
				}
			}
		}

		case SET_SUBMITTED_CHECKPOINT_SUCCESSFUL: {
			return {
				...state,
				indicators: {
					...state.indicators,
					submittedCheckpointSuccessful: action.success
				}
			}
		}

		case BROADCAST_BUTTON_STATE: {
			return {
				...state,
				indicators: {
					...state.indicators,
					currentButtonState: action.buttonState
				}
			}
		}
		case SCHEDULE_BUTTON_STATE: {
			return {
				...state,
				indicators: {
					...state.indicators,
					buttonStateScheduleQueue: state.indicators.buttonStateScheduleQueue
						.enqueue(action.buttonState)
						.copy()
				}
			}
		}
		case RESET_BUTTON_STATE_SCHEDULE: {
			return {
				...state,
				indicators: {
					...state.indicators,
					buttonStateScheduleQueue: new SafeQueue([])
				}
			}
		}

		case PUSH_TO_LOADED_CHECKPOINTS_PROGRESS: {
			/**
			 * For newly submitted checkpoints
			 */
			let newCheckpointsProgress
			const checkpointId = Object.keys(action.newLoads)[0]
			if (state.progress.checkpointsProgress[checkpointId]) {
				newCheckpointsProgress = {
					[checkpointId]: action.newLoads[checkpointId].concat(
						state.progress.checkpointsProgress[checkpointId]
					)
				}
			} else {
				newCheckpointsProgress = {
					...state.progress.checkpointsProgress,
					...action.newLoads
				}
			}

			return {
				...state,
				indicators: {
					...state.indicators,
					submittedCheckpointSuccessful: undefined
				},
				progress: {
					...state.progress,
					checkpointsProgress: newCheckpointsProgress
				}
			}
		}

		default:
			return state
	}
}

/** HELPERS */

const hintStatusSeparation = node => {
	if (!node.hints) return

	node.unlockedHints = node.hints.filter(hint => {
		return hint.isUnlocked
	})

	node.lockedHints = node.hints.filter(hint => {
		hintStatusSeparation(hint)
		return !hint.isUnlocked
	})
}

export default reducer
