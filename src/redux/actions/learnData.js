import { get, merge as mergeDeep, cloneDeep } from 'lodash'
import { iterateNodes, objectArrayToObject } from '../../utils/objUtils'
import { genFetch } from '../../services/ContentfulService'
import {
	fetchActivitySkeleton,
	fetchActivityProgress,
	fetchCardStatus,
	fetchCheckpointProgress,
	unlockCard,
	unlockHint,
	submitCheckpointProgress
} from '../../services/LearnService'

import { STATE_HINT } from '../../components/Learn/NextButton/NextButton'

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

/* ===== INITIALIZATION */

/**
 * Setup the Learning View with appropriate activity
 * and user progress
 * @param {*} activityId
 */
export const init = activityId => async dispatch => {
	/**
	 * FETCH_ACTIVITY_SKELETON
	 *  - provide roadmap/foundation of id's and content id's for
	 *    the entire activity
	 *
	 * FETCH_ACTIVITY_PROGRESS
	 *  - get the card the user is currently on
	 */
	let [activitySkeleton, activityProgress] = await Promise.all([
		fetchActivitySkeleton(activityId),
		fetchActivityProgress(activityId)
	])

	/**
	 * sort by order just in case it isn't
	 */
	activitySkeleton.cards.sort((a, b) => a.order - b.order)

	// send to redux
	dispatch(setActivitySkeleton(activitySkeleton))

	// Process activityProgress
	let index = activitySkeleton.cards.findIndex(
		card => card.contentfulId === activityProgress.cardContentfulId
	)
	if (index === -1) index = 0 // TODO also an error here
	activityProgress = {
		currentCardIndex: index,
		lastCardUnlockedIndex: index
	}

	// send to redux
	dispatch(setActivityProgress(activityProgress))

	const cardsProgressed = activitySkeleton.cards.slice(0, index + 1)

	// Fetch Unlocked Card data
	const unlockedCards = await fetchUnlockedCards(cardsProgressed)
	// console.log(unlockedCards)
	dispatch(setUnlockedCards(unlockedCards))

	// Fetch Cards and their Statuses
	// (from fetchActivityProgress, multiple fetchCardStatus)
	const cardStatuses = await initCardStatuses(activityId, unlockedCards)
	dispatch(setCardStatuses(cardStatuses))

	const checkpointProgresses = await initCheckpointProgress(unlockedCards)
	dispatch(
		pushToLoadedCheckpointsProgress(objectArrayToObject(checkpointProgresses))
	)
}

const fetchUnlockedCards = cardsProgressed => {
	return Promise.all(
		cardsProgressed.map(async card => {
			const [unprocessedCardData, concepts] = await Promise.all([
				genFetch(card.contentfulId),
				Promise.all(
					card.concepts.map(concept => {
						return genFetch(concept.contentfulId) // fetch concept steps
					})
				)
			])

			/**
			 * This destructure allows you to exclude variables from cardData
			 * Excluded variables are the variables listed before
			 *  - destructure renames added for additional info
			 */
			const {
				hints,
				checkpoint,
				concepts: useless,
				...cardData // just in case more data is added later
			} = unprocessedCardData

			const newCard = {
				...card,
				...cardData,
				hints: card.hints.map((hint, i) => ({ ...hints[i], ...hint })),
				checkpoint: card.checkpoint
					? { ...card.checkpoint, ...checkpoint }
					: null,
				concepts
			}

			return cloneDeep(newCard)
		})
	)
}

const initCardStatuses = (activityId, unlockedCards) =>
	Promise.all(
		unlockedCards.map(async card => {
			if (get(card, 'hints.length') === 0) return []
			const [cardStatus, cardData] = await Promise.all([
				fetchCardStatus(activityId, card.id),
				genFetch(card.contentfulId, 5)
			])
			const allHintsData = cardData.hints
			mergeDeep(cardStatus, allHintsData)

			iterateNodes(cardStatus, node => {
				// processing (kinda useless but for now, easier readability)
				// this is done bc the hint object doesn't provide anything useful
				// ^ (id, contentfulId)
				if (node.hint) {
					Object.assign(node, { ...node.hint })
					delete node.hint
				}

				if (node.isUnlocked === false) {
					// need false check
					node.steps = []
				}
			})
			return cardStatus
		})
	)

const initCheckpointProgress = unlockedCards =>
	Promise.all(
		unlockedCards
			.filter(card => card.checkpoint)
			.map(async card => {
				const progress = await fetchCheckpointProgress(card.checkpoint.id)
				return { [card.checkpoint.id]: progress.submissions }
			})
	)

const setActivitySkeleton = activity => ({
	type: SET_ACTIVITY_SKELETON,
	activity
})

const setActivityProgress = activityProgress => ({
	type: SET_ACTIVITY_PROGRESS,
	activityProgress
})

const setUnlockedCards = unlockedCards => ({
	type: SET_UNLOCKED_CARDS,
	unlockedCards
})

const setCardStatuses = cardStatuses => ({
	type: SET_CARD_STATUSES,
	cardStatuses
})

// ===== RUNTIME

export const resetToInitialState = () => ({
	type: RESET_TO_INITIAL_STATE
})

export const initUnlockCard = (activityId, id, contentId) => async dispatch => {
	const card = await genFetch(contentId)

	if (card.concepts && card.concepts.length) {
		card.concepts = await Promise.all(
			card.concepts.map(concept => {
				return genFetch(concept.contentfulId)
			})
		)
	}

	dispatch(setCard(card))

	unlockCard(activityId, id).then(res => console.log(res.message))
}

export const initUnlockHint = (activityId, id, contentId) => async dispatch => {
	const hint = await genFetch(contentId)
	dispatch(setHint(id, contentId, hint))
	dispatch(scheduleButtonState(STATE_HINT))

	unlockHint(activityId, id).then(res => console.log(res.message))
}

export const initSubmitCheckpointProgress = (
	activityId,
	checkpointId,
	type,
	content
) => async dispatch => {
	try {
		const response = await submitCheckpointProgress(
			activityId,
			checkpointId,
			type,
			content
		)
		dispatch(setSubmittedCheckpointSuccessful(true))
		dispatch(
			// correct format
			pushToLoadedCheckpointsProgress({
				[checkpointId]: [{ results: response }]
			})
		)
	} catch (e) {
		console.log(e)
		dispatch(setSubmittedCheckpointSuccessful(false))
	}
}

export const setCurrentCardByIndex = cardIndex => ({
	type: SET_CURRENT_CARD_BY_INDEX,
	cardIndex
})
export const incrementCurrentCardIndex = () => ({
	type: INCREMENT_CURRENT_CARD_INDEX
})

export const setLastCardUnlockedIndexById = cardId => ({
	type: SET_LAST_CARD_UNLOCKED_INDEX_BY_ID,
	cardId
})
export const incrementLastCardUnlockedIndex = () => ({
	type: INCREMENT_LAST_CARD_UNLOCKED_INDEX
})

const setSubmittedCheckpointSuccessful = success => ({
	type: SET_SUBMITTED_CHECKPOINT_SUCCESSFUL,
	success
})

export const broadcastButtonState = buttonState => ({
	type: BROADCAST_BUTTON_STATE,
	buttonState
})
export const scheduleButtonState = buttonState => ({
	type: SCHEDULE_BUTTON_STATE,
	buttonState
})
export const resetButtonStateSchedule = buttonState => ({
	type: RESET_BUTTON_STATE_SCHEDULE,
	buttonState
})

export const pushToLoadedCheckpointsProgress = newLoads => ({
	type: PUSH_TO_LOADED_CHECKPOINTS_PROGRESS,
	newLoads
})

const setCard = card => ({
	type: SET_CARD,
	card
})

const setHint = (id, contentId, hint) => ({
	type: SET_HINT,
	id,
	contentId,
	hint
})
