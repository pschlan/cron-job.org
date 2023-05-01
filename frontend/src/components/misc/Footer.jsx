import React, { useRef, useState } from 'react';
import { Typography, Link, makeStyles, Dialog, DialogTitle, DialogContent, FormControlLabel, Radio, RadioGroup, DialogActions, Button, Box } from '@material-ui/core';
import { useTranslation } from 'react-i18next';
import { Config } from '../../utils/Config';
import TwitterIcon from '@material-ui/icons/Twitter';
import GitHubIcon from '@material-ui/icons/GitHub';
import LanguageIcon from '@material-ui/icons/Language';
import useLanguageCode from '../../hooks/useLanguageCode';

const useStyles = makeStyles((theme) => ({
  icon: {
    height: '1rem',
    verticalAlign: 'middle'
  },
  link: {
    cursor: 'pointer'
  }
}));

function LanguageSelectorDialog({ onClose }) {
  const { t, i18n } = useTranslation();
  const onCloseHook = useRef(onClose, []);
  const languageCode = useLanguageCode();

  return <Dialog open={true} onClose={onCloseHook} maxWidth='xs' fullWidth>
    <DialogTitle>{t('common.language')}</DialogTitle>
    <DialogContent>
      <RadioGroup value={languageCode} onChange={({target}) => i18n.changeLanguage(target.value)}>
        {Object.keys(Config.languages).map(lang => <FormControlLabel
          key={lang}
          value={lang}
          label={Config.languages[lang]}
          control={<Radio />}
          />)}
      </RadioGroup>
    </DialogContent>
    <DialogActions>
        <Button onClick={onCloseHook.current} color='primary'>
          {t('common.close')}
        </Button>
    </DialogActions>
  </Dialog>;
}

export default function Footer({ narrow = false }) {
  const classes = useStyles();
  const { t } = useTranslation();
  const [ showLanguageDialog, setShowLanguageDialog ] = useState(false);
  const languageCode = useLanguageCode();

  const Copyright = () => <>&copy; {new Date().getFullYear()} <Link color="inherit" href={Config.baseURL} target="_blank" rel="noopener">{Config.productName}</Link></>;

  return <>
    {showLanguageDialog && <LanguageSelectorDialog onClose={() => setShowLanguageDialog(false)} />}
    <Typography variant="body2" color="textSecondary" align="center">
      {!narrow && <><Copyright /> | </>}
      <><LanguageIcon className={classes.icon} /><Link color="inherit" className={classes.link} onClick={() => setShowLanguageDialog(true)}>{Config.languages[languageCode]}</Link></>
      {(Config.footerLinks || []).map(link => <React.Fragment key={link.title}> | <link.icon className={classes.icon} /><Link color="inherit" href={link.href} target={link.target}>{t(link.title)}</Link></React.Fragment>)}
      {Config.twitterURL && <> | <TwitterIcon className={classes.icon} /><Link color="inherit" href={Config.twitterURL} target="_blank" rel="noopener">{t('common.followontwitter')}</Link></>}
      {Config.githubURL && <> | <GitHubIcon className={classes.icon} /><Link color="inherit" href={Config.githubURL} target="_blank" rel="noopener">{t('common.forkongithub')}</Link></>}
      {narrow && <Box mt={2}><Copyright /></Box>}
    </Typography>
  </>;
}
