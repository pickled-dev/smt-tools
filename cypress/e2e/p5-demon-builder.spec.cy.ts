describe('P5 Demon Builder Test', () => {
	beforeEach(() => {
		cy.visit('/p5/fusion-chain')
	})
	describe('Successful Cases', () => {
		describe('Normal Fusions', () => {
			describe('No Name', () => {
				it('works with a normal, no-name, no-level, 1-depth, fusion', () => {
					cy.enterSkills(['Life Aid', 'Gigantomachia', 'Arms Master'])
					cy.pushButton('Calculate')
					cy.checkNumberOfResults(29)
				})
				it('works with a normal, no-name, level, 1-depth, fusion', () => {
					cy.enterLevel(37)
					cy.enterSkills([
						'Mabufula',
						'Miracle Punch',
						'Attack Master',
					])
					cy.pushButton('Calculate')
					cy.checkNumberOfResults(33)
				})
				//TODO
				/* it('works with a normal, no-name, no-level, 2+ depth, fusion', () => {
					cy.get('.skill-form-field').first().click().type('Dekaja')
                }) */
				//TODO
				/* it('works with a normal, no-name, level, 2+ depth, fusion', () => {
					cy.get('.skill-form-field').first().click().type('Dekaja')
				}) */
			})
			describe('Name', () => {
				//TODO
				/* it('works with a normal, named, no-level, ', () => {
					cy.get('.demon-form-field')
						.first()
						.click()
						.type('Neko Shogun')
					cy.get('.skill-form-field').first().click().type('Dekaja')
				}) */
				it('works with a normal, named, level, fusion', () => {
					cy.enterName('Sandman')
					cy.enterLevel(26)
					cy.enterSkills([
						'Pulinpa',
						'Confuse Boost',
						'Dodge Phys',
						'Sharp Student',
					])
					cy.pushButton('Calculate')
					cy.checkNumberOfResults(5)
				})
				//TODO
				/* it('works with a normal, named, no-level, 2+ depth, ', () => {
					cy.get('.demon-form-field')
						.first()
						.click()
						.type('Neko Shogun')
					cy.get('.skill-form-field').first().click().type('Dekaja')
				}) */
				//TODO
				/* it('works with a normal, named, level, 2+ depth, ', () => {
					cy.get('.demon-form-field')
						.first()
						.click()
						.type('Neko Shogun')
					cy.get('.skill-form-field').first().click().type('Dekaja')
				}) */
			})
		})
		describe('Special Fusion', () => {
			describe('No Name', () => {
				//TODO
				/* it('works with a special, no-name, no-level, 1-depth, fusion', () => {})
				it('works with a special, no-name, level, 1-depth, fusion ', () => {
					cy.get('.skill-form-field').first().click().type('Dekaja')
				})
				it('works with a special, no-name, no-level,2+ depth, fusion', () => {
					cy.get('.skill-form-field').first().click().type('Dekaja')
				})
				it('works with a special, no-name, level, 2+ depth,  fusion', () => {
					cy.get('.skill-form-field').first().click().type('Dekaja')
				}) */
			})
			describe('Name', () => {
				it('works with a special, named, no-level, 1-depth fusion', () => {
					cy.enterName('Neko Shogun')
					cy.enterSkills(['Dekaja'])
					cy.pushButton('Calculate')
					cy.checkNumberOfResults(1)
				})
			})
			/* it('works with a special, named, level, 1-depth, fusion', () => {
					cy.get('.demon-form-field')
						.first()
						.click()
						.type('Neko Shogun')
					cy.get('.skill-form-field').first().click().type('Dekaja')
				})
				it('works with a special, named, no-level, 2+ depth, fusion', () => {
					cy.get('.demon-form-field')
						.first()
						.click()
						.type('Neko Shogun')
					cy.get('.skill-form-field').first().click().type('Dekaja')
				})
				it('works with a special, named, level, 2+ depth, fusion', () => {
					cy.get('.demon-form-field')
						.first()
						.click()
						.type('Neko Shogun')
					cy.get('.skill-form-field').first().click().type('Dekaja')
				}) */
		})
	})

	describe('Failing Cases', () => {
		//Failing cases
		it('fails because the level is too for the demon', () => {
			cy.enterName('Mara')
			cy.enterLevel(10)
			cy.enterSkills(['Zio'])
			cy.pushButton('Calculate')
			cy.checkError(Errors.LevelDemon)
		})
		it('fails because the level is too low for one of the skills', () => {
			cy.enterLevel(17)
			cy.enterSkills(['Maragion'])
			cy.pushButton('Calculate')
			cy.checkError(Errors.LevelSkill)
		})
		//TODO bad output because its tries to build alice, so it switches to a named function
		/* it('fails because the level is too low for one of the special skills', () => {
			cy.get('.demon-form-field').eq(1).click().type('17')
			cy.get('.skill-form-field').first().click().type('Die For Me!')
			cy.get('button').contains('Calculate').click()
			cy.get('.build-results').should(
				'contain',
				'You have specified a level that is lower than the minimum required level to learn'
			)
		}) */
		it("fails because the demon can't learn a unique skills", () => {
			cy.enterName('Agathion')
			cy.enterSkills(['Die For Me!'])
			cy.pushButton('Calculate')
			cy.checkError(Errors.Unique)
		})
		it("fails because the demon can't inherit a type of a specified skill", () => {
			cy.enterName('Agathion')
			cy.enterSkills(['Garu'])
			cy.pushButton('Calculate')
			cy.checkError(Errors.InheritType)
		})
		it("fails because the demon can't inherit that many skills; with name", () => {
			cy.enterName('Sandman')
			cy.enterSkills([
				'Pulinpa',
				'Confuse Boost',
				'Dodge Phys',
				'Sharp Student',
				'Bufu',
				'Magaru',
				'Agi',
				'Garu',
			])
			cy.pushButton('Calculate')
			cy.checkError(Errors.InheritLimit)
		})
		it("fails because the demon can't inherit that many skills; without name", () => {
			cy.enterSkills([
				'Auto-Maraku',
				'Auto-Mataru',
				'Auto-Masuku',
				'Absorb Phys',
				'Absorb Bless',
				'Absorb Nuke',
				'Sharp Student',
				'Life Aid',
			])
			cy.pushButton('Calculate')
			cy.checkError(Errors.InheritLimit)
		})
		it('fails because the demon is a treasure demon', () => {
			cy.enterName('Hope Diamond')
			cy.enterSkills(['Mapsio'])
			cy.pushButton('Calculate')
			cy.checkError(Errors.Treasure)
		})
	})
})
enum Errors {
	LevelSkill = 'You have specified a level that is lower than the minimum required level to learn',
	LevelDemon = 'The name of the demon you entered has a minimum level greater than the level you specified.',
	InheritType = 'Every Persona has an inheritance type that bars them from learning certain skills. For example persona with inheritance type of Fire cannot inherit Ice skills. You have specified a Persona with an inheritance type that forbids them from learning a skill you have specified.',
	InheritLimit = 'In Persona 5, a normal demon can only inherit a maximum of 4 skills (special demons can inherit 5). Since you specificed more than that, your specified demon must be able to learn at least one of the other specificed skills on their own. Unfortunately, they cannot.',
	Unique = 'You entered a skill that is unique to',
	Treasure = 'The name of the demon you entered is a treasure demon, and cannot be fused.',
}
