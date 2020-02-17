import React, { useMemo } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { scroller } from 'react-scroll'
import ReactMarkdown from 'react-markdown'
import { get } from 'lodash'

import ClampedText from '../../shared/utils/ClampedText'

const Container = styled.div`
	display: flex;
	flex-direction: column;
`

const NavSubWrapper = styled.div`
	padding: 0.75em;
	padding-left: ${props => 1.2 * props.nestLevel}em;
	display: flex;
	align-items: center;
	cursor: pointer;
`

const NavSubitem = styled(ClampedText)`
	font-size: 80%;
	font-style: italic;
`

const NavSubitemImg = styled.div`
	width: 4.8em;
	text-align: center;
	font-style: normal;
	color: ${props => props.theme.accent};
	flex-shrink: 0;
`

const CardHints = ({ setHasSubitems, unlockedHints }) => {
	let mapHintIndex = 0

	const handleScrollTo = hintId => {
		scroller.scrollTo(`unlocked-hint-${hintId}`, {
			duration: 500,
			smooth: true,
			containerId: 'content',
			offset: -document.getElementById('content-header').clientHeight + 1
		})
	}

	const renderedHintsRecursive = (unlockedHints, nestLevel = 0) => {
		if (!unlockedHints) return

		return unlockedHints.map(hint => {
			const { id, name } = hint
			const index = mapHintIndex++
			setHasSubitems(true)
			return (
				<React.Fragment key={`sidebar-hint-${id}`}>
					<NavSubWrapper
						className="hover-lift transition-short"
						nestLevel={nestLevel}
						onClick={() => handleScrollTo(id)}
					>
						<NavSubitemImg>&bull;</NavSubitemImg>
						<NavSubitem clamp={1}>
							<ReactMarkdown className="markdown-header" source={name} />
						</NavSubitem>
					</NavSubWrapper>
					{renderedHintsRecursive(hint.unlockedHints, nestLevel + 1)}
				</React.Fragment>
			)
		})
	}

	// prettier-ignore
	const renderedHints = useMemo(
    () => renderedHintsRecursive(unlockedHints), [
		unlockedHints
	])

	return <Container>{renderedHints}</Container>
}

const mapStateToProps = state => {
	const {
		learnData: {
			cards,
			indicators: { currentCardIndex }
		}
	} = state

	const unlockedHints = cards && get(cards[currentCardIndex], 'unlockedHints')

	return {
		unlockedHints
	}
}

export default connect(mapStateToProps)(CardHints)
