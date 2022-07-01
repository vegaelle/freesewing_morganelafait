import React from 'react'
import DesignIcon from 'shared/components/icons/design'
import { useTranslation } from 'next-i18next'
import {Picker, PickerLink} from 'shared/components/picker'

const PatternPicker = ({ app }) => {
  const { t } = useTranslation(['common'])

  const pickerProps = {
    Icon: DesignIcon,
    title: t('designs'),
    className: 'overflow-y-scroll navdrop'
  }

  return (<Picker {...pickerProps}>
    {Object.keys(app.navigation).map(section => {
      const sectionProps = {
        selectedItem: t(app.navigation[section].__title),
        isStatic: true
      }
      const sectionTitle = t(app.navigation[section].__title);
      {return (<React.Fragment key={section}>
        <li className={`
          capitalize font-bold text-base-content text-center
          opacity-50 border-b2 my-2 border-base-content
          `} {...sectionProps}>
          {sectionTitle}
        </li>
        {Object.keys(app.navigation[section]).filter((p)=>!p.startsWith('__')).map(pattern => {
          const patternProps = {
            href: app.navigation[section][pattern].__slug,
            key: pattern
          }

          return (<PickerLink {...patternProps} >
            <span className="sr-only">{sectionTitle}</span> {app.navigation[section][pattern].__title}
          </PickerLink>)
        })}
      </React.Fragment>)}
    })}
  </Picker>)
}

export default PatternPicker
