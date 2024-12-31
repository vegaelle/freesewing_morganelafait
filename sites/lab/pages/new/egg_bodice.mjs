/*
 * This page is auto-generated. Do not edit it by hand.
 */
import { Egg_bodice } from 'designs/egg_bodice/src/index.mjs'
// Dependencies
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { nsMerge } from 'shared/utils.mjs'
// Components
import { PageWrapper, ns as pageNs } from 'shared/components/wrappers/page.mjs'
import { Workbench, ns as wbNs } from 'shared/components/workbench/new.mjs'
import { WorkbenchLayout } from 'site/components/layouts/workbench.mjs'

// Translation namespaces used on this page
const ns = nsMerge('egg_bodice', wbNs, pageNs)

const NewEgg_bodicePage = ({ page, docs }) => (
  <PageWrapper {...page} title="Egg_bodice" layout={WorkbenchLayout} header={null}>
    <Workbench
      {...{
        design: 'egg_bodice',
        Design: Egg_bodice,
        docs,
      }}
    />
  </PageWrapper>
)

export default NewEgg_bodicePage

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ns)),
      page: {
        locale,
        path: ['new', 'egg_bodice'],
        title: 'Egg_bodice',
      },
    },
  }
}
