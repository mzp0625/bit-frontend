import React, { useEffect } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'

import SidebarHeader from './SidebarHeader'
import SidebarNav from './SidebarNav'

import { slideIn, fadeIn } from '../../../styles/GlobalAnime'

const Container = styled.div`
	flex: 0.36;
	background: #fafafa;
	display: flex;
	flex-direction: column;

	@media screen and (orientation: landscape) {
		flex: 0.21;
	}
`

const Sidebar = ({ isReady }) => {
	useEffect(() => {
		if (isReady) {
			fadeIn('.learn-i-sidebar')
			slideIn('.learn-i-sidebar')
		}
	}, [isReady])

	return (
		<Container className="learn-i-sidebar">
			{isReady && (
				<>
					<SidebarHeader />
					<SidebarNav />
				</>
			)}
		</Container>
	)
}

const mapStateToProps = state => ({
	isReady: !!state.learnData.name
})

export default connect(mapStateToProps)(Sidebar)